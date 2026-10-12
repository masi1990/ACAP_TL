import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** Create a fresh evaluation application so CoC can be demo-issued again */
export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const product = await prisma.product.findFirst();
  if (!product) return NextResponse.json({ error: "No product" }, { status: 400 });
  const app = await prisma.certificationApplication.create({
    data: {
      productId: product.id,
      organizationId: "org-kebs-cb",
      standardVersionId: "stdver-ars-464-2022",
      status: "EVALUATION",
      markScheme: "QUALITY",
      qualityApprovedAt: new Date(),
    },
  });
  return NextResponse.json({ message: `New application ${app.id} ready for CoC issue`, applicationId: app.id });
}
