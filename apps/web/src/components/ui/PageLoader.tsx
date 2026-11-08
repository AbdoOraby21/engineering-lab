import Spinner from './Spinner';

export default function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
