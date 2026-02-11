/**
 * Common utility functions for the application
 * This file contains reusable functions that can be used across the entire project
 */

/**
 * Validate IP address or IP network (CIDR notation)
 * @param value - The IP address or IP network string to validate
 * @returns Empty string if valid, error message if invalid
 * 
 * @example
 * validateIPNetwork("192.168.1.1") // returns ""
 * validateIPNetwork("192.168.1.0/24") // returns ""
 * validateIPNetwork("invalid") // returns error message
 */
export const validateIPNetwork = (value: string): string => {
    if (!value || value.trim() === "") {
        return "IP Network is required";
    }

    const trimmedValue = value.trim();
    
    // Check for CIDR notation (e.g., 192.168.1.0/24)
    const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    // Check for simple IP address (e.g., 192.168.1.1)
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    
    if (cidrPattern.test(trimmedValue)) {
        // Validate CIDR notation
        const [ip, cidr] = trimmedValue.split('/');
        const cidrNum = parseInt(cidr, 10);
        if (isNaN(cidrNum) || cidrNum < 0 || cidrNum > 32) {
            return "CIDR notation must be between 0 and 32";
        }
        // Validate IP part
        const ipParts = ip.split('.');
        if (ipParts.length !== 4) {
            return "IP address must have 4 octets";
        }
        for (const part of ipParts) {
            const num = parseInt(part, 10);
            if (isNaN(num) || num < 0 || num > 255) {
                return "Each IP octet must be between 0 and 255";
            }
        }
        return "";
    } else if (ipPattern.test(trimmedValue)) {
        // Validate simple IP address
        const ipParts = trimmedValue.split('.');
        if (ipParts.length !== 4) {
            return "IP address must have 4 octets";
        }
        for (const part of ipParts) {
            const num = parseInt(part, 10);
            if (isNaN(num) || num < 0 || num > 255) {
                return "Each IP octet must be between 0 and 255";
            }
        }
        return "";
    } else {
        return "Please enter a valid IP address (e.g., 192.168.1.1) or IP network (e.g., 192.168.1.0/24)";
    }
};

