import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

// Integration test — requires running Docker PostgreSQL
// Run: docker compose up -d db && npm run db:migrate
describe("Database integration", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: "test-" } },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: "test-" } },
    });
    await prisma.$disconnect();
  });

  it("creates a user with ADMIN role", async () => {
    const user = await prisma.user.create({
      data: {
        email: "test-admin@test.com",
        passwordHash: "fake-hash",
        fullName: "Test Admin",
        role: "ADMIN",
      },
    });
    expect(user.id).toBeDefined();
    expect(user.role).toBe("ADMIN");
  });

  it("creates STUDENT and pairs with MENTOR", async () => {
    const mentor = await prisma.user.create({
      data: {
        email: "test-mentor@test.com",
        passwordHash: "fake-hash",
        fullName: "Test Mentor",
        role: "MENTOR",
      },
    });

    const student = await prisma.user.create({
      data: {
        email: "test-student@test.com",
        passwordHash: "fake-hash",
        fullName: "Test Student",
        role: "STUDENT",
        mentorId: mentor.id,
      },
    });

    expect(student.mentorId).toBe(mentor.id);

    const mentorWithMentees = await prisma.user.findUnique({
      where: { id: mentor.id },
      include: { mentees: true },
    });
    expect(mentorWithMentees?.mentees).toHaveLength(1);
    expect(mentorWithMentees?.mentees[0].id).toBe(student.id);
  });

  it("enforces unique email constraint", async () => {
    await expect(
      prisma.user.create({
        data: {
          email: "test-admin@test.com",
          passwordHash: "hash",
          fullName: "Dupe",
          role: "STUDENT",
        },
      })
    ).rejects.toThrow();
  });

  it("enforces role enum values", async () => {
    await expect(
      prisma.user.create({
        data: {
          email: "test-invalid@test.com",
          passwordHash: "hash",
          fullName: "Bad Role",
          role: "INVALID_ROLE" as any,
        },
      })
    ).rejects.toThrow();
  });
});
