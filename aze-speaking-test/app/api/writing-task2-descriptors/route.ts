import { NextResponse } from "next/server";
import { WRITING_TASK2 } from "../../writing/writing-task2-descriptors";

export async function GET() {
  return NextResponse.json(WRITING_TASK2);
}
