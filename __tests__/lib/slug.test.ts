import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("turns product names into URL slugs", () => {
    expect(slugify("My New Product!")).toBe("my-new-product");
  });
});
