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
      const currentTime = new Date().toLocaleTimeString();
      console.log(`Refreshing Lightning channels at ${currentTime}`);
      // Use the correct controller endpoint for refreshing channels
      const response = await fetch(window.location.pathname + '/refresh-channels');
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Channel refresh result:", result);
      
      // Log all response data for debugging
      console.log(`Full response data at ${currentTime}:`, JSON.stringify(result, null, 2));
      
      // Handle different response formats
      let channelsData = [];
      
      // If result has a channels array, use that
      if (result.success && Array.isArray(result.channels)) {
        console.log(`Found ${result.channels.length} channels in response`);
        channelsData = result.channels;
      } 
      // If result has orders array, use that
      else if (result.success && Array.isArray(result.orders)) {
        console.log(`Found ${result.orders.length} orders in response`);
        channelsData = result.orders;
      }
      // If result itself is an array, use it directly
      else if (Array.isArray(result)) {
        console.log(`Result is directly an array with ${result.length} items`);
        channelsData = result;
      }
      // If we have a single order object
      else if (result.order_id) {
        console.log(`Found a single order with ID: ${result.order_id}`);
        channelsData = [result];
      }
      // Try to extract data from any other format
      else {
        console.log("No standard channel data format found, trying to extract useful data");
        if (result.data) {
          console.log("Found 'data' property in response");
          if (Array.isArray(result.data)) {
            channelsData = result.data;
          } else {
            channelsData = [result.data];
          }
        } else if (Object.keys(result).length > 0) {
          // As a last resort, just use the entire result as a single item
          console.log("Using entire result as channel data");
          channelsData = [result];
        }
      }
      
      // Update the UI with new channels data
      if (channelsData.length > 0) {
        console.log("Dispatching channels-updated event with data:", channelsData);
        const event = new CustomEvent('channels-updated', { detail: channelsData });
        document.dispatchEvent(event);
      } else {
        console.warn("No channel data found to update UI");
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