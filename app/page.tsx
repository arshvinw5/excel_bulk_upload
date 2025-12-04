import { ExcelUploader } from "@/app/components/excel_upload";

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-background py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Bulk Data Upload
        </h1>

        {/* Main Excel Uploader Component */}
        <ExcelUploader />
      </div>
    </main>
  );
}
