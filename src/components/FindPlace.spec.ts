import { describe, it, expect } from "vitest";
import { bstStep } from "./FindPlace";

describe(bstStep, () => {
  it("halves the search space", () => {
    expect(
      bstStep({
        range: { start: 0, end: 10 },
        index: 5,
        sense: "yes-i-remember",
      }),
    ).toEqual({
      range: { start: 6, end: 10 },
      index: 8,
      remainingSteps: 2,
      type: "step",
    });
  });

  it('halves the search space with "no"', () => {
    expect(
      bstStep({
        range: { start: 0, end: 10 },
        index: 5,
        sense: "no-i-dont-remember",
      }),
    ).toEqual({
      range: { start: 0, end: 4 },
      index: 2,
      remainingSteps: 2,
      type: "step",
    });
  });

  it('terminates the search with "yes"', () => {
    expect(
      bstStep({
        range: { start: 6, end: 7 },
        index: 7,
        sense: "yes-i-remember",
      }),
    ).toEqual({
      index: 7,
      type: "success",
      range: { start: 7, end: 7 },
    });
  });

  it('terminates the search with "no"', () => {
    expect(
      bstStep({
        range: { start: 6, end: 7 },
        index: 7,
        sense: "no-i-dont-remember",
      }),
    ).toEqual({
      index: 6,
      type: "success",
      range: { start: 6, end: 6 },
    });
  });

  it("works even if the index isn't the midpoint", () => {
    expect(
      bstStep({
        range: { start: 0, end: 10 },
        index: 3,
        sense: "no-i-dont-remember",
      }),
    ).toEqual({
      range: { start: 0, end: 2 },
      index: 1,
      remainingSteps: 1,
      type: "step",
    });
  });

  it("works even if the index is outside the range", () => {
    expect(
      bstStep({
        range: { start: 0, end: 10 },
        index: 11,
        sense: "no-i-dont-remember",
      }),
    ).toEqual({
      range: { start: 0, end: 10 },
      index: 5,
      remainingSteps: 4,
      type: "step",
    });
  });
});
