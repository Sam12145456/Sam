import React from 'react';
import { Switch } from '~/components/ui/Switch';
import { useSettings } from '~/lib/hooks/useSettings';

export default function FeaturesTab() {
  const { debug, enableDebugMode, isLocalModel, enableLocalModels, eventLogs, enableEventLogs, isGitHubAuth, enableGitHubAuth } = useSettings();
  return (
    <div className="p-4 bg-bolt-elements-bg-depth-2 border border-bolt-elements-borderColor rounded-lg mb-4">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Optional Features</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-bolt-elements-textPrimary">Debug Info</span>
          <Switch className="ml-auto" checked={debug} onCheckedChange={enableDebugMode} />
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-bolt-elements-textPrimary">Event Logs</span>
          <Switch className="ml-auto" checked={eventLogs} onCheckedChange={enableEventLogs} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-bolt-elements-textPrimary">GitHub Auth</span>
            <Switch className="ml-auto" checked={isGitHubAuth} onCheckedChange={enableGitHubAuth} />
          </div>
          <p className="text-sm text-bolt-elements-textSecondary">A utility feature that Provides GitHub authentication. If your feature needs GitHub authentication you can use this. The useGitHubAuth() hook provides authentication state including login status, loading state, and user information. Once authenticated, you can access the GitHub token from localStorage.</p>
        </div>
      </div>

      <div className="mb-6 border-t border-bolt-elements-borderColor pt-4">
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Experimental Features</h3>
        <p className="text-sm text-bolt-elements-textSecondary mb-4">
          Disclaimer: Experimental features may be unstable and are subject to change.
        </p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-bolt-elements-textPrimary">Enable Local Models</span>
          <Switch className="ml-auto" checked={isLocalModel} onCheckedChange={enableLocalModels} />
        </div>
      </div>
    </div>
  );
}
