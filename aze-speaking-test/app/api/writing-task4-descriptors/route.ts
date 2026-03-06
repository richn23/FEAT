import { NextResponse } from "next/server";
import { WRITING_TASK4 } from "../../writing/writing-task4-descriptors";

export async function GET() {
  return NextResponse.json(WRITING_TASK4);
}
