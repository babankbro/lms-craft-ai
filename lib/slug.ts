import { prisma } from "@/lib/prisma";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "") // keep letters, marks (Thai vowels), numbers, spaces, hyphens
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function uniqueSlug(base: string): Promise<string> {
  let slug = base || "course";
  let i = 1;
  while (await prisma.course.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
