import type { SortDirection } from "./tableSorting";
import { sortIndicator } from "./tableSorting";

export function SortableHeader(props: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button className="table-sort-button" onClick={props.onClick} type="button">
      <span>{props.label}</span>
      <span className="sort-indicator" data-active={props.active}>
        {sortIndicator(props.active ? props.direction : null)}
      </span>
    </button>
  );
}
