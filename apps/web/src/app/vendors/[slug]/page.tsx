import { PublicVendorPage } from '../../../components/vendor/public-vendor-page';

export default async function VendorPublicPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <PublicVendorPage slug={slug} />; }
