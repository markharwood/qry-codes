import { expect } from "chai";
import { bytesConversion } from "../src/bytesConversion";
 

const testBase64="+JOGDpIHdFgT//xCv+0EKzkvYU1/KK5bDbWwv7MlgXXsPTuJQrRUPTbSgyL7WfYh5/7qmt5hxtqRZrZQQigqtBTrY1+mm5zGsFJoOotLzOL4PFnRcQBS4DBzaU5P2Yxqja0xMrkRnl9DgkLIBK91VMVE88NQBZtG8HHk3fW0ChlauRy14qroO+vqmkY5PF4zOd5dVyqI1xIuvicPGFEhvTTua4MYLwRsu/PkFrRRX8T4EgtCK/YP9DtYzwvALL1H"
/**
 * Compares two Uint8Arrays to check if they have identical contents.
 * @param a The first Uint8Array.
 * @param b The second Uint8Array.
 * @returns `true` if the arrays have the same contents, otherwise `false`.
 */
export function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false; // Different lengths → not equal
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false; // Found a mismatch
    }
    return true; // Arrays match
}

describe("Uint8array conversions", () => {


    it("should convert base64->bytes->hex->bytes->base64 ok", () => {
        let byteFromBase64 = bytesConversion.fromBase64(testBase64)
        expect(byteFromBase64.length).to.equal(192);

        let hexString = bytesConversion.toHex(byteFromBase64)
        let byteFromHex = bytesConversion.fromHex(hexString)
        expect(uint8ArraysEqual(byteFromBase64,byteFromHex)).to.equal(true)

        let newBase64 = bytesConversion.toBase64(byteFromHex)
        expect(newBase64).to.equal(testBase64);
    });

});