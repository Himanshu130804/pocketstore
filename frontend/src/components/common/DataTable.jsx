import React from "react";
import "./DataTable.css";

export default function DataTable({ columns = [], rows = [], empty = "No data available" }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{safeColumns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {safeRows.length ? safeRows.map((row, index) => (
            <tr key={row?._id || index}>
              {safeColumns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row?.[column.key]}</td>
              ))}
            </tr>
          )) : (
            <tr><td colSpan={Math.max(safeColumns.length, 1)} className="table-empty">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
