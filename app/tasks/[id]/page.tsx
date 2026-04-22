import CardDetail from "./card-detail";

export default async function TaskCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CardDetail taskId={id} />;
}
