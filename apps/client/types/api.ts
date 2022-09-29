import type { NextApiRequest } from "next";

// Not sure why this field is just set to any by the NextApiRequest
export type TypedNextApiRequest<Body = any> = Omit<NextApiRequest, "body"> & {
  body: Body;
};
