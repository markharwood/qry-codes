/**
 * Provides utility functions for converting between `Uint8Array`, base64, and hex.
 * Typically used to convert JSON strings loaded from data sources into binary vectors used as QRy-codes
 */
const bytesConversion = {
  /**
   * Converts a `Uint8Array` to a base64 string.
   * @param data The `Uint8Array` to convert.
   * @returns A base64-encoded string.
   */
  toBase64(data: Uint8Array): string {
      return btoa(String.fromCharCode(...data));
  },

  /**
   * Converts a base64 string to a `Uint8Array`.
   * @param base64 The base64-encoded string.
   * @returns A `Uint8Array` representation of the data.
   */
  fromBase64(base64: string): Uint8Array {
      return new Uint8Array([...atob(base64)].map(c => c.charCodeAt(0)));
  },

  /**
   * Converts a `Uint8Array` to a hex string.
   * @param data The `Uint8Array` to convert.
   * @returns A hexadecimal string.
   */
  toHex(data: Uint8Array): string {
      return Array.from(data)
          .map(byte => byte.toString(16).padStart(2, '0'))
          .join('');
  },

  /**
   * Converts a hex string to a `Uint8Array`.
   * @param hex The hex string to convert.
   * @returns A `Uint8Array` representation of the data.
   */
  fromHex(hex: string): Uint8Array {
      if (hex.length % 2 !== 0) {
          throw new Error("Invalid hex string length");
      }
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(hex.substring(i * 2, (i * 2) + 2), 16);
      }
      return bytes;
  }
};

export {bytesConversion}