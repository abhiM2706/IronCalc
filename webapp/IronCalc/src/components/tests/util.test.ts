import { expect, test } from "vitest";
import { isNavigationKey } from "../util";
import {
  decreaseDecimalPlaces,
  increaseDecimalPlaces,
} from "../FormatMenu/formatUtil";

test("checks arrow left is a navigation key", () => {
  expect(isNavigationKey("ArrowLeft")).toBe(true);
  expect(isNavigationKey("Arrow")).toBe(false);
});

test("checks arrow right is a navigation key", () => {
  expect(isNavigationKey("ArrowRight")).toBe(true);
});

test("checks arrow up is a navigation key", () => {
  expect(isNavigationKey("ArrowUp")).toBe(true);
});

test("checks arrow down is a navigation key", () => {
  expect(isNavigationKey("ArrowDown")).toBe(true);
});

test("checks home is a navigation key", () => {
  expect(isNavigationKey("Home")).toBe(true);
});

test("checks end is a navigation key", () => {
  expect(isNavigationKey("End")).toBe(true);
});

test("increase decimals", () => {
  expect(increaseDecimalPlaces("0.00")).toBe("0.000");
  expect(increaseDecimalPlaces("0.0")).toBe("0.00");
  expect(increaseDecimalPlaces("0")).toBe("0.0");
  expect(increaseDecimalPlaces("0.0%")).toBe("0.00%");
  expect(increaseDecimalPlaces("0.00%")).toBe("0.000%");
  expect(increaseDecimalPlaces("0.0E+0")).toBe("0.00E+0");
  expect(increaseDecimalPlaces("0.00E+0")).toBe("0.000E+0");
  expect(increaseDecimalPlaces("0.0E-0")).toBe("0.00E-0");
  expect(increaseDecimalPlaces("0.00E-0")).toBe("0.000E-0");
});

test("decrease decimals", () => {
  expect(decreaseDecimalPlaces("0.000")).toBe("0.00");
  expect(decreaseDecimalPlaces("0.00")).toBe("0.0");
  expect(decreaseDecimalPlaces("0.0")).toBe("0");
  expect(decreaseDecimalPlaces("0.000%")).toBe("0.00%");
  expect(decreaseDecimalPlaces("0.00%")).toBe("0.0%");
  expect(decreaseDecimalPlaces("0.0%")).toBe("0%");
  expect(decreaseDecimalPlaces("0.000E+0")).toBe("0.00E+0");
  expect(decreaseDecimalPlaces("0.00E+0")).toBe("0.0E+0");
  expect(decreaseDecimalPlaces("0.0E+0")).toBe("0E+0");
  expect(decreaseDecimalPlaces("0.000E-0")).toBe("0.00E-0");
  expect(decreaseDecimalPlaces("0.00E-0")).toBe("0.0E-0");
  expect(decreaseDecimalPlaces("0.0E-0")).toBe("0E-0");
});
