import { useRef, useState } from "react";
import { getNow } from "../../utils/time";

/**
 * Desktop-only (#177) - the raw filter state behind the main transaction
 * table and the category tabs: which category tab is selected, the date
 * range, and the table's own search/sort/pagination. Mobile has no
 * equivalent (its category views and table controls don't exist in this
 * shape), so this isn't a #190 dedup case.
 *
 * Deliberately narrower than it might look: `openCategory`/`closeCategory`
 * and the date-range step/goto helpers (`handleStepMonth`/`gotoMonth`/
 * `gotoYear`) stay in Dashboard.jsx rather than living here, because they
 * also reach into useToolPanels (closing an open tool when a category
 * opens) and the date-picker popover's own state (closing it after a
 * selection) - cross-cutting orchestration that would otherwise force this
 * hook to take a pile of unrelated setters as parameters just to stay
 * "complete". Owning the plain state and handing back its setters is a
 * cleaner boundary than a leaky one.
 */
export function useTransactionFilters() {
  const [activeTab, setActiveTab] = useState("ALL"); // "ALL" | any category
  const [categoryClosing, setCategoryClosing] = useState(false);
  const categoryCloseTimer = useRef(null);

  const [dateRange, setDateRange] = useState(() => {
    const now = getNow();
    const from = new Date(now);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setMonth(to.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  });
  const [activePreset, setActivePreset] = useState("Current Month");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState(null);
  const [tableQuery, setTableQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  function handleSort(col) {
    if (col === "date") {
      if (sortColumn === "date")
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortColumn("date");
        setSortDir("desc");
      }
    } else {
      if (sortColumn !== col) {
        setSortColumn(col);
        setSortDir("asc");
      } else if (sortDir === "asc") setSortDir("desc");
      else {
        setSortColumn("date");
        setSortDir("desc");
      }
    }
  }

  return {
    activeTab,
    setActiveTab,
    categoryClosing,
    setCategoryClosing,
    categoryCloseTimer,
    dateRange,
    setDateRange,
    activePreset,
    setActivePreset,
    page,
    setPage,
    perPage,
    setPerPage,
    typeFilter,
    setTypeFilter,
    tableQuery,
    setTableQuery,
    sortColumn,
    sortDir,
    handleSort,
  };
}
