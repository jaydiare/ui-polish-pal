declare module "@tanstack/react-query" {
  export { QueryClient } from "@tanstack/query-core";
}

declare module "react-helmet-async" {
  import * as React from "react";

  export const Helmet: React.ComponentType<any>;
  export const HelmetProvider: React.ComponentType<any>;
}

declare module "recharts" {
  import * as React from "react";

  export const ResponsiveContainer: React.ComponentType<any>;
  export const CartesianGrid: React.ComponentType<any>;
  export const Tooltip: React.ComponentType<any>;
  export const Legend: React.ComponentType<any>;

  export const XAxis: React.ComponentType<any>;
  export const YAxis: React.ComponentType<any>;
  export const Line: React.ComponentType<any>;
  export const LineChart: React.ComponentType<any>;
  export const ReferenceLine: React.ComponentType<any>;

  export const Bar: React.ComponentType<any>;
  export const BarChart: React.ComponentType<any>;
  export const Cell: React.ComponentType<any>;

  export const Scatter: React.ComponentType<any>;
  export const ScatterChart: React.ComponentType<any>;

  const _default: any;
  export default _default;
}
