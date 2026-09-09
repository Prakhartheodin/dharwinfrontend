export default function HelpAndSupportPage() {
  return (
    <div className="relative h-screen w-screen">
      <iframe
        src="https://support.theodin.ai/"
        title="Help & Support"
        allow="storage-access-by-user-activation"
        referrerPolicy="strict-origin-when-cross-origin"
        className="fixed inset-0 block h-screen w-screen border-0 m-0 p-0"
      />
    </div>
  );
}
