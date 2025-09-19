interface NoticeProps {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function Notice({ title, body, ctaLabel, onCta }: NoticeProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {title}
          </h3>
          <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            <p>{body}</p>
          </div>
          {ctaLabel && onCta && (
            <div className="mt-4">
              <button
                onClick={onCta}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
              >
                {ctaLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
