import { NextApiRequest, NextApiResponse } from "next/types";
import nc from "next-connect";
import { ZodError } from "zod";

/**
 * Generic next API handler with error catching
 */
export const apiHandler = () =>
  nc<NextApiRequest, NextApiResponse>({
    onError: async (err, req, res) => {
      if (err instanceof ZodError) {
        res.status(400).json({ message: err.message });
        return;
      }

      res
        .status(err.status ?? 500)
        .end(
          err.status !== 500
            ? err.message ?? err.response.body ?? "Internal Server Error"
            : "Internal Server Error"
        );
    },
    onNoMatch: (req, res) => {
      res.status(404).end("Not Found");
    },
  });
