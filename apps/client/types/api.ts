import type { NextApiRequest } from "next";

// Not sure why this field is just set to any by the NextApiRequest
export type TypedNextApiRequest<Query = any, Body = any> = Omit<
  NextApiRequest,
  "body" | "query"
> & {
  body: Body;
  query: Query;
};
