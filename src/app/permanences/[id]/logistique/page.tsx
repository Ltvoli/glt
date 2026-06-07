import GenericSection from '../generic-section'

export default async function LogistiquePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <GenericSection permanenceId={id} sectionKey="logistique" sectionName="Logistique & Accès" />
}
