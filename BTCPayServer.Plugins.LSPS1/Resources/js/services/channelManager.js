// ChannelManager - Handles fetching and refreshing Lightning channels
window.ChannelManager = {
  refreshingChannels: false,
  channelPollingInterval: null,

  async refreshChannels() {
    if (this.refreshingChannels) {
      console.log("Channel refresh already in progress, skipping");
      return;
    }

    this.refreshingChannels = true;
    try {
      console.log(`Refreshing Lightning channels at ${new Date().toLocaleTimeString()}`);
      // Use the correct controller endpoint for refreshing channels
      const response = await fetch(window.location.pathname + '/refresh-channels');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Channel refresh result:", result);
      
      // Update the UI with new channels
      if (result.success && Array.isArray(result.channels)) {
        // Find the channels component and update it
        const event = new CustomEvent('channels-updated', { detail: result.channels });
        document.dispatchEvent(event);
      }
      
      return result;
    } catch (error) {
      console.error("Error refreshing channels:", error);
      return { success: false, error: error.message };
    } finally {
      this.refreshingChannels = false;
    }
  },
  
  // Start polling for channel updates
  startChannelPolling() {
    // Clear any existing interval
    if (this.channelPollingInterval) {
      clearInterval(this.channelPollingInterval);
    }
    
    // Do an initial refresh
    this.refreshChannels();
    
    // Set up polling every 5 seconds
    this.channelPollingInterval = setInterval(() => {
      this.refreshChannels();
    }, 5000);
    
    console.log("Channel polling started at", new Date().toLocaleTimeString());
  },
  
  // Stop polling for channel updates
  stopChannelPolling() {
    if (this.channelPollingInterval) {
      clearInterval(this.channelPollingInterval);
      this.channelPollingInterval = null;
      console.log("Channel polling stopped at", new Date().toLocaleTimeString());
    }
  }
};