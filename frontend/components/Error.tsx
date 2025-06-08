import { CircleAlert } from 'lucide-react';

export default function Error({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-500/50 px-4 py-3 text-red-600 flex items-center gap-4">
      <CircleAlert size={24} aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
