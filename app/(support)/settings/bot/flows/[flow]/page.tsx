import { FlowEditorPage } from "@/components/bot/flow-editor";

export default async function BotFlowPage({ params }: { params: Promise<{ flow: string }> }) {
  const { flow } = await params;
  return <FlowEditorPage flow={decodeURIComponent(flow)} />;
}
