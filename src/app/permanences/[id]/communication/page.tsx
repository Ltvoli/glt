import GenericSection from '../generic-section'

export default async function CommunicationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <GenericSection permanenceId={id} sectionKey="communication" sectionName="Communication" />
}
