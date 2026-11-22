import { MaterialReaderPage } from "@/components/materials/StudentMaterials";
export const metadata={title:'Course reading'};
export default async function Page({params}:{params:Promise<{materialId:string}>}){return <MaterialReaderPage materialId={(await params).materialId} />;}
