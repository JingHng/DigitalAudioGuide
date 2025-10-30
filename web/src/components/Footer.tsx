export function Footer() {
  return (
    <footer className="border-t bg-white mt-auto">
      <div className="mx-auto max-w-[1000px] px-4 py-3 text-xs text-slate-500 text-center sm:text-left">
        API base: {import.meta.env.VITE_API_BASE ?? "(dev proxy)"}
      </div>
    </footer>
  );
}
