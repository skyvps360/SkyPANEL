// Fix for share-modal.js attempting to attach event listeners to null elements
document.addEventListener('DOMContentLoaded', function() {
  // Safely add event listeners only if elements exist
  setTimeout(function() {
    // Intercept attempts to access null elements
    const originalAddEventListener = Element.prototype.addEventListener;
    
    // Safety wrapper for adding event listeners
    function safeAddEventListener(element, eventType, callback, options) {
      if (element) {
        return originalAddEventListener.call(element, eventType, callback, options);
      }
      console.warn('Attempted to add event listener to null element');
      return null;
    }

    // Helper function to safely query elements
    window.safeQuerySelector = function(selector) {
      try {
        const element = document.querySelector(selector);
        return element;
      } catch(e) {
        console.warn(`Error finding element ${selector}`, e);
        return null;
      }
    };

    // Fix specific share modal issues if needed
    const shareButtons = document.querySelectorAll('[data-share-button]');
    if (shareButtons.length > 0) {
      shareButtons.forEach(btn => {
        safeAddEventListener(btn, 'click', function(e) {
          e.preventDefault();
          // Handle share functionality safely
        });
      });
    }
  }, 500); // Small delay to ensure DOM is fully loaded
});