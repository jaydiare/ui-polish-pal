declare module "@tanstack/react-query" {
  import * as React from "react";

  export class QueryClient {
    constructor(config?: any);
  }

  export const QueryClientProvider: React.ComponentType<any>;
  export function useQuery(options: any): any;
}

declare module "react-helmet-async" {
  import * as React from "react";

  export const Helmet: React.ComponentType<any>;
  export const HelmetProvider: React.ComponentType<any>;
}

declare module "recharts" {
  import * as React from "react";

  export type LegendProps = any;

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

  export const Area: React.ComponentType<any>;
  export const AreaChart: React.ComponentType<any>;

  const _default: any;
  export default _default;
}
