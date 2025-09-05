// spTableLoader.runtime.js
(function (w, $) {
  "use strict";

  // --- Ensure constants are available ---
  const scope = w.SPTableLoader || {};
  const { NS, CONFIG, TableMap, TABLE_RE_LIT, TABLE_RE_NUM, TABLE_RE_NAM } = scope;
  if (!NS || !CONFIG || !TableMap || !TABLE_RE_LIT || !TABLE_RE_NUM || !TABLE_RE_NAM) {
    console.error("[SPTableLoader] Constants not loaded. Ensure spTableLoader.constants.js is included BEFORE this file.");
    return;
  }

  console.log(`${NS} Runtime initialized`);

  // --- Helpers for regex state ---
  function resetRegexes() {
    TABLE_RE_LIT.lastIndex = 0;
    TABLE_RE_NUM.lastIndex = 0;
    TABLE_RE_NAM.lastIndex = 0;
  }
  function htmlHasShortcodes(html) {
    resetRegexes();
    return TABLE_RE_LIT.test(html) || TABLE_RE_NUM.test(html) || TABLE_RE_NAM.test(html);
  }

  // --- Replace shortcode variants with <div id="..."></div> and collect IDs ---
  function replaceShortcodesInHtml(html) {
    const found = new Set();
    const replacer = (_full, id) => {
      if (id) {
        found.add(id);
        return `<div id="${id}"></div>`;
      }
      return _full;
    };

    let newHtml = html || "";
    resetRegexes();
    newHtml = newHtml.replace(TABLE_RE_LIT, replacer);
    resetRegexes();
    newHtml = newHtml.replace(TABLE_RE_NUM, replacer);
    resetRegexes();
    newHtml = newHtml.replace(TABLE_RE_NAM, replacer);

    return { html: newHtml, ids: Array.from(found), changed: found.size > 0 };
  }

  // --- Build tables for any placeholders created ---
  async function replaceTableShortcodes($container) {
    if (!$container?.length) return;

    const containerId = $container.attr("id") || "(no-id)";
    if (CONFIG.logGroups) console.group(`${NS} [replaceTableShortcodes] ${containerId}`);

    const html = $container.html() || "";
    const { html: newHtml, ids, changed } = replaceShortcodesInHtml(html);

    if (!changed) {
      console.log(`${NS} [replaceTableShortcodes] No shortcodes found`);
      if (CONFIG.logGroups) console.groupEnd();
      return;
    }

    // Write updated HTML (use string to avoid encoding issues)
    try { $container.html(newHtml); }
    catch (err) {
      console.error(`${NS} [replaceTableShortcodes] Failed to set HTML:`, err);
      if (CONFIG.logGroups) console.groupEnd();
      return;
    }

    const builder = w.buildComponentFromSPBackend?.buildTable;
    if (!builder) {
      console.error(`${NS} [replaceTableShortcodes] buildTable() not available`);
      if (CONFIG.logGroups) console.groupEnd();
      return;
    }

    const promises = ids.map(async (tableId) => {
      const tableInfo = TableMap[tableId];
      if (!tableInfo) {
        console.warn(`${NS} [replaceTableShortcodes] Missing mapping for ${tableId} (placeholder left)`);
        return;
      }
      const tLabel = `${NS} [buildTable] ${tableId}`;
      console.time(tLabel);
      try {
        await builder(
          {
            listName: tableInfo.listName,
            columns: [
              { column: "Column1", displayName: "Column 1" },
              { column: "Column2", displayName: "Column 2" },
              { column: "Column3", displayName: "Column 3" }
            ],
            filters: tableInfo.filters
          },
          tableId
        );
      } catch (e) {
        console.error(`${NS} [replaceTableShortcodes] buildTable failed for ${tableId}`, e);
      } finally {
        console.timeEnd(tLabel);
      }
    });

    await Promise.allSettled(promises);
    if (CONFIG.logGroups) console.groupEnd();
  }

  // --- Observe container for shortcodes, then replace ---
  function observeAndReplaceShortcodes(targetId, options = {}) {
    const { timeoutMs = CONFIG.observerTimeoutMs, immediateCheck = true } = options;
    const el = document.getElementById(targetId);
    if (!el) return Promise.resolve();

    const label = `${NS} [Timing] Observer -> #${targetId}`;
    console.time(label);

    return new Promise(async (resolve) => {
      let done = false;
      let observer;

      const complete = async (reason) => {
        if (done) return;
        done = true;
        try { observer && observer.disconnect(); } catch {}
        console.timeEnd(label);
        console.log(`${NS} [observeAndReplace] ${reason}`);
        await replaceTableShortcodes($(el));
        resolve();
      };

      // Immediate pass
      if (immediateCheck && htmlHasShortcodes(el.innerHTML)) {
        await complete("Immediate shortcodes");
        return;
      }

      // Watch for injections
      observer = new MutationObserver(() => {
        if (htmlHasShortcodes(el.innerHTML)) complete("Detected via mutation");
      });
      observer.observe(el, { childList: true, subtree: true, characterData: true });

      // Fallback
      setTimeout(() => complete("Timeout"), timeoutMs);
    });
  }

  // --- Load a section, then run observer ---
  async function loadHTMLSection(listName, sectionName, targetId) {
    const displayHTML = w.buildComponentFromSPBackend?.displayHTML;
    if (!displayHTML) {
      console.error(`${NS} [loadHTMLSection] displayHTML() not available`);
      return;
    }

    if (CONFIG.logGroups) console.group(`${NS} [loadHTMLSection] ${sectionName} -> #${targetId}`);

    const totalLabel = `${NS} [Timing] Total -> #${targetId}`;
    const htmlLabel  = `${NS} [Timing] displayHTML -> #${targetId}`;
    console.time(totalLabel);
    console.time(htmlLabel);

    await displayHTML(
      {
        listName,
        columns: [{ column: "Content", displayName: "Content" }],
        filters: [{ column: "Section", operator: "eq", value: `'${sectionName}'` }]
      },
      targetId
    );

    console.timeEnd(htmlLabel);
    console.log(`${NS} [loadHTMLSection] HTML loaded into #${targetId}`);

    await observeAndReplaceShortcodes(targetId, { timeoutMs: CONFIG.observerTimeoutMs, immediateCheck: true });

    console.timeEnd(totalLabel);
    if (CONFIG.logGroups) console.groupEnd();
  }

  // --- URL hashing for tabs (update + restore) ---
  function enableTabHashing(tabContainerSelector) {
    const $tabs = $(tabContainerSelector);
    if (!$tabs.length) return;

    // Update hash on activate
    $tabs.tabs("option", "activate", function (_event, ui) {
      const newTabId = ui?.newPanel?.attr("id");
      if (!newTabId) return;
      const newHash = `#${newTabId}`;
      if (history.pushState) history.pushState(null, null, newHash);
      else location.hash = newHash;
      console.log(`[TabHashing] Updated URL hash to ${newHash}`);
    });

    // Restore from hash on load
    const initialHash = w.location.hash;
    if (initialHash) {
      const $panel = $(initialHash);
      if ($panel.length) {
        const index = $tabs.find(".ui-tabs-panel").index($panel);
        if (index >= 0) {
          $tabs.tabs("option", "active", index);
          console.log(`[TabHashing] Activated tab from hash: ${initialHash}`);
        }
      }
    }
  }

  // --- App init ---
  async function init() {
    console.log(`${NS} [init] Initializing sections...`);

    const sections = [
      { section: "Request pick up tab intro-new", targetId: "pick-content" },
      { section: "Feedback tab content",          targetId: "feed-content" },
      { section: "Optimization tab intro",        targetId: "optimize-content" },
      { section: "Sanitization tab content",      targetId: "sani-content" },
      { section: "Publishing tab intro",          targetId: "autopublish-content" },
      { section: "Validation - CID Intro",        targetId: "validation-cid-content" },
      { section: "Validation - Credentials Intro",targetId: "validation-cred-content" }
    ];

    if (CONFIG.runParallel) {
      await Promise.allSettled(sections.map(s => loadHTMLSection("Dynamic HTML", s.section, s.targetId)));
    } else {
      for (const s of sections) await loadHTMLSection("Dynamic HTML", s.section, s.targetId);
    }

    console.log(`${NS} [init] Initializing jQuery UI tabs...`);
    $("#tab-content-container").tabs({ heightStyle: "content" });
    $("#validation-subtabs").tabs({ heightStyle: "content" });

    // Enable URL hashing after tabs exist
    enableTabHashing("#tab-content-container");
    enableTabHashing("#validation-subtabs");

    console.log(`${NS} [init] Tabs ready`);
  }

  // --- Boot ---
  $(document).ready(() => {
    console.log(`${NS} [Document Ready] Starting init...`);
    init().catch(err => console.error(`${NS} [init] Error:`, err));
  });

  // Optional: expose some functions for debugging/testing
  w.SPTableLoader = Object.assign(w.SPTableLoader || {}, {
    loadHTMLSection,
    observeAndReplaceShortcodes,
    replaceTableShortcodes
  });

})(window, jQuery);
