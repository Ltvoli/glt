import GenericSection from '../generic-section'

export default async function InstitutionnelPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <GenericSection permanenceId={id} sectionKey="institutionnel" sectionName="Institutionnel & Presse" />
}
