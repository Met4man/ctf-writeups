# daddyrev — XOR Reverse Engineering

**Category:** Forensics / Reverse Engineering  
**Difficulty:** Easy  
**Platform:** CTFzone Labs  
**Date:** 2026-03-19  
**Flag:** `urchinsec{I_n0w_we_tr134D_but_FRAILED}`

---

## Challenge Description

A 64-bit Go binary. The hint: "I like my environment to be very clean."

---

## Analysis

```bash
file daddyrev
# ELF 64-bit LSB executable, dynamically linked

strings daddyrev | grep -E "ctf|key|cipher|flag|env"
# os.LookupEnv
# ctfzone
# hexCipher
# key1 / key2
```

The hint "clean environment" = no environment variables set = the key is the environment variable name itself: `ctfzone`.

The hex cipher was found embedded in the binary strings:

```
1606051206001606171d33300055142b111f301a175247523e300c10172b20282e272926301b
```

---

## Exploit

XOR the hex cipher with the repeating key `ctfzone`:

```python
hex_cipher = "1606051206001606171d33300055142b111f301a175247523e300c10172b20282e272926301b"
raw = bytes.fromhex(hex_cipher)
key = b"ctfzone"
flag = bytes([raw[i] ^ key[i % len(key)] for i in range(len(raw))])
print(flag.decode())
```

---

## Flag

```
urchinsec{I_n0w_we_tr134D_but_FRAILED}
```

---

## Key Takeaways

- **Strings analysis is always the first step** on unknown binaries — look for embedded keys, ciphers, and function names
- **XOR with repeating key is common CTF obfuscation** — if ciphertext length is not a multiple of key length it wraps around
- **Challenge hints are literal** — "clean environment" meant the env var name was the key
- **Go binaries are verbose** — they include a lot of symbol information even when stripped compared to C binaries
