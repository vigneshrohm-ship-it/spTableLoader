
// spTableLoader.constants.js
(function (w) {
  "use strict";

  // Namespace
  const NS = "[SPTableLoader]";

  // Config (tune to your needs)
  const CONFIG = {
    observerTimeoutMs: 1000,  // reduce further if observer logs show instant detection
    runParallel: true,        // load all sections concurrently
    logGroups: true
  };

  // Table mappings (add 4/5/6 when ready)
  const TableMap = {
    "pick-table-1": {
      listName: "Master Table",
      filters: [{ column: "Title", operator: "eq", value: "'Request pick up tab intro-new'" }]
    },
    "feed-table-1": {
      listName: "Master Table",
      filters: [{ column: "Title", operator: "eq", value: "'Feedback tab content'" }]
    },
    "sani-table-1": {
      listName: "Master Table",
      filters: [{ column: "Title", operator: "eq", value: "'Sanitization tab content'" }]
    },
    "autopublish-table-1": {
      listName: "Master Table",
      filters: [{ column: "Title", operator: "eq", value: "'Publishing tab intro'" }]
    },
    "validation-Project-table-1": {
      listName: "Master Table",
      filters: [
        { column: "Title", operator: "eq", value: "'Validation'" },
        { column: "SubTitle", operator: "eq", value: "'Project'" },
        { column: "Category", operator: "eq", value: "'Content in and out scope'" }
      ]
    },
    "validation-Project-table-2": {
      listName: "Master Table",
      filters: [
        { column: "Title", operator: "eq", value: "'Validation'" },
        { column: "SubTitle", operator: "eq", value: "'Project'" },
        { column: "Category", operator: "eq", value: "'Request completeness - Project'" }
      ]
    },
    "validation-Project-table-3": {
      listName: "Master Table",
      filters: [
        { column: "Title", operator: "eq", value: "'Validation'" },
        { column: "SubTitle", operator: "eq", value: "'Project'" },
        { column: "Category", operator: "eq", value: "'Compliance/Copyright - Project'" }
      ]
    }
    // TODO: Add mappings for validation-Project-table-4/5/6
  };

  // Regex patterns for shortcodes (literal + encoded)
  const QUOTE = `(?:['"]|&quot;)?`;
  const TABLE_RE_LIT = new RegExp(`\\[table\\b[\\s\\S]*?\\bid\\s*=\\s*${QUOTE}([^'"\\]\\s]+)${QUOTE}[\\s\\S]*?\\]`, "gi");
  const TABLE_RE_NUM = new RegExp(`&#91;table\\b[\\s\\S]*?\\bid\\s*=\\s*${QUOTE}([^'"&#\\]\\s]+)${QUOTE}[\\s\\S]*?&#93;`, "gi");
  const TABLE_RE_NAM = new RegExp(`&lsqb;table\\b[\\s\\S]*?\\bid\\s*=\\s*${QUOTE}([^'"&\\]\\s]+)${QUOTE}[\\s\\S]*?&rsqb;`, "gi");

  // Expose constants on a single global namespace
  w.SPTableLoader = Object.assign(w.SPTableLoader || {}, {
    NS,
    CONFIG,
    TableMap,
    QUOTE,
    TABLE_RE_LIT,
    TABLE_RE_NUM,
    TABLE_RE_NAM
  });

  if (w.SPTableLoader && w.SPTableLoader.NS) {
    console.log(`${w.SPTableLoader.NS} Constants loaded`);
  }
})(window);
