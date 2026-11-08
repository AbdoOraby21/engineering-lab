interface FieldErrorProps {
  message?: string;
}

export default function FieldError({ message }: FieldErrorProps) {
  if (!message) {
    return null;
  }
  return (
    <p className="field-error" role="alert">
      {message}
    </p>
  );
}
