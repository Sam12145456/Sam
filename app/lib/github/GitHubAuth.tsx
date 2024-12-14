import React, { useState, useCallback, useEffect } from 'react';
import { GITHUB_CONFIG } from './config';
import { useSettings } from '~/lib/hooks/useSettings';

interface GitHubAuthProps {
  onAuthComplete?: (token: string) => void;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}

interface GitHubErrorResponse {
  error?: string;
  error_description?: string;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface AccessTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

export function GitHubAuth({ onAuthComplete, onError, children }: GitHubAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const { isGitHubAuth } = useSettings();

  const pollForToken = useCallback(
    async (code: string, interval: number, attempts = 0) => {
      if (attempts >= GITHUB_CONFIG.maxPollAttempts) {
        setIsPolling(false);
        onError?.(new Error('Authentication timed out. Please try again.'));
        return;
      }

      try {
        const params = new URLSearchParams({
          endpoint: GITHUB_CONFIG.accessTokenEndpoint,
          client_id: GITHUB_CONFIG.clientId,
          device_code: code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        });

        const response = await fetch(`${GITHUB_CONFIG.proxyUrl}?${params}`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
        });

        const data = await response.json();

        if (response.status === 202) {
          // Authorization is pending, continue polling
          setTimeout(() => pollForToken(code, interval, attempts + 1), interval * 1000);
          return;
        }

        if (!response.ok) {
          throw new Error(data.error_description || data.error || 'Authentication failed');
        }

        if (!data.access_token) {
          throw new Error('Invalid response from GitHub');
        }

        // Store the token in localStorage before completing auth
        localStorage.setItem('github_token', data.access_token);
        setIsPolling(false);
        onAuthComplete?.(data.access_token);
      } catch (error: any) {
        setIsPolling(false);
        onError?.(error);
      }
    },
    [onAuthComplete, onError],
  );

  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        endpoint: GITHUB_CONFIG.deviceCodeEndpoint,
        client_id: GITHUB_CONFIG.clientId,
        scope: GITHUB_CONFIG.scope,
      });

      const response = await fetch(`${GITHUB_CONFIG.proxyUrl}?${params}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error_description || data.error || 'Failed to start authentication process');
      }

      const data: DeviceCodeResponse = await response.json();

      if (!data.device_code || !data.user_code || !data.verification_uri) {
        throw new Error('Invalid response from GitHub');
      }

      setDeviceCode(data.device_code);
      setUserCode(data.user_code);
      setVerificationUrl(data.verification_uri);
      setIsPolling(true);

      pollForToken(data.device_code, data.interval || GITHUB_CONFIG.pollInterval);
    } catch (error: any) {
      setIsLoading(false);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [pollForToken, onError]);

  useEffect(() => {
    return () => {
      setIsPolling(false);
      setIsLoading(false);
    };
  }, []);

  const handleCopyCode = useCallback(() => {
    if (userCode) {
      navigator.clipboard.writeText(userCode);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  }, [userCode]);

  if (!isGitHubAuth) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-lg">
        <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl animate-spin" />
        <p className="text-gray-500">Initializing GitHub authentication...</p>
      </div>
    );
  }

  if (userCode && verificationUrl) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-lg">
        <p className="text-gray-500">Enter this code at <a href={verificationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">{verificationUrl}</a></p>
        <div className="flex items-center gap-2">
          <code className="bg-gray-100 px-4 py-2 rounded-lg text-lg font-mono">
            {userCode}
          </code>
          <button
            onClick={handleCopyCode}
            className="text-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-2"
          >
            {showCopied ? (
              <div className="i-ph:check text-xl" />
            ) : (
              <div className="i-ph:copy text-xl" />
            )}
          </button>
        </div>
        {isPolling && (
          <p className="text-sm text-gray-500">
            Waiting for authorization... You can close the GitHub window once authorized.
          </p>
        )}
      </div>
    );
  }

  return React.cloneElement(children as React.ReactElement, {
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      initializeAuth();
      (children as React.ReactElement).props.onClick?.(e);
    },
  });
}
