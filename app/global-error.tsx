'use client';

import * as Sentry from '@sentry/nextjs';
import Error from 'next/error';
import { useEffect } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/utils/chunk-error';

export default function GlobalError({
	error,
}: {
	error: Error & { digest?: string };
}) {
	useEffect(() => {
		Sentry.captureException(error);
		// A page left open across a new deploy: load the new version once instead of showing an error.
		if (isChunkLoadError(error)) reloadOnceForChunkError();
	}, [error]);

	return (
		<html lang="en">
			<body>
				{/* `NextError` is the default Next.js 500 error page component */}
				<Error statusCode={500} />
			</body>
		</html>
	);
}
