import { HOME_TEXT } from "../shared/categoryVisuals";

// Placeholder shown in place of a chart when its date range has no data
// (#177). Named distinctly from MobileAnalytics's own unrelated "Empty"
// helper (different markup/copy, not a duplicate of this one) to avoid any
// confusion between the two.
export default function EmptyChartState() {
  return (
    <div
      className="h-70 flex items-center justify-center text-base"
      style={{ color: HOME_TEXT }}
    >
      No data yet
    </div>
  );
}
