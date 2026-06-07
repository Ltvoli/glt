import GenericSection from '../generic-section'

export default async function CourrierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <GenericSection permanenceId={id} sectionKey="courrier" sectionName="Courrier Postal" />
}
