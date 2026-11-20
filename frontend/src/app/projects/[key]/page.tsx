import { redirect } from "next/navigation";

export default async function ProjectDefaultPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  redirect(`/projects/${key.toUpperCase()}/board`);
}
