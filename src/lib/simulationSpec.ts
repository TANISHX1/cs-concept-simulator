import { z } from "zod";

const ComplexitySchema = z.object({
  time: z.string(),
  space: z.string(),
});

const ArrayStepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SWAP"),
    indices: z.tuple([z.number(), z.number()]),
  }),
  z.object({
    type: z.literal("COMPARE"),
    indices: z.tuple([z.number(), z.number()]),
  }),
  z.object({
    type: z.literal("HIGHLIGHT"),
    indices: z.array(z.number()),
  }),
]);

const GraphInitialStateSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
    }),
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
    }),
  ),
});

const GraphStepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("VISIT_NODE"),
    id: z.string(),
  }),
  z.object({
    type: z.literal("TRAVERSE_EDGE"),
    from: z.string(),
    to: z.string(),
  }),
  z.object({
    type: z.literal("HIGHLIGHT"),
    ids: z.array(z.string()),
  }),
]);

const SharedSimulationSpecFields = {
  title: z.string(),
  pseudocode: z.string(),
  complexity: ComplexitySchema,
  pitfalls: z.array(z.string()),
};

export const SimulationSpecSchema = z.discriminatedUnion("visualType", [
  z.object({
    ...SharedSimulationSpecFields,
    visualType: z.literal("array"),
    initialState: z.array(z.number()),
    steps: z.array(ArrayStepSchema),
  }),
  z.object({
    ...SharedSimulationSpecFields,
    visualType: z.literal("graph"),
    initialState: GraphInitialStateSchema,
    steps: z.array(GraphStepSchema),
  }),
]);

export type SimulationSpec = z.infer<typeof SimulationSpecSchema>;
