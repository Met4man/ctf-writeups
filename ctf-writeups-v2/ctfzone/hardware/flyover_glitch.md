# FlyOver Firmware — Voltage Glitch Attack

**Category:** Hardware  
**Difficulty:** Easy  
**Platform:** CTFzone Labs  
**Date:** 2026-03-19  
**Flag:** `urchinsec{gl1tch_att4ck_byp4ss_succ3ss}`

---

## Challenge Description

You have obtained the firmware for a FlyChip v2.1 microcontroller used in a high-security access control system. Bypass the PIN verification without knowing the correct PIN — simulating a real-world voltage glitch attack.

---

## Analysis

The firmware is a Python simulation of a secure bootloader. The `verify_pin()` function compares each byte of the user PIN one at a time, running three CPU instructions per byte:

```
10 INIT cycles → instruction_cycle = 10

Byte 0:  LOAD(11)  COMPARE(12)  BRANCH(13)  ← glitch here → return True
Byte 1:  LOAD(14)  COMPARE(15)  BRANCH(16)  ← glitch here → return True
Byte 2:  LOAD(17)  COMPARE(18)  BRANCH(19)  ← glitch here → return True
Byte 3:  LOAD(20)  COMPARE(21)  BRANCH(22)  ← glitch here → return True
```

**Glitch window: cycles 11–22** — every PIN comparison cycle is vulnerable.

The voltage drop simulation is in `_execute_instruction()`:

```python
if self.instruction_cycle == self.target_glitch_cycle:
    if self.glitch_window:
        glitched_this_cycle = True   # voltage drop happens here

return not glitched_this_cycle       # returns False when glitched
```

When BRANCH is glitched it returns `False`, and `verify_pin()` immediately returns `True`:

```python
if not self._execute_instruction("BRANCH"):
    return True   # PIN never checked — access granted
```

---

## Vulnerability

The `boot()` function was intentionally broken — never calls `verify_pin()`. Fixed version:

```python
def boot(self, user_pin, glitch_timing=None):
    self.target_glitch_cycle = glitch_timing  # arm the glitch
    result = self.verify_pin(user_pin)
    if result:
        self.reveal_flag()
    else:
        print("Access denied.")
    return result
```

---

## Exploit

Target cycle 13 — the BRANCH instruction for the first PIN byte. The PIN value is irrelevant.

```bash
python3 firmware.py 0000 13
```

**Execution flow:**

```
boot('0000', glitch_timing=13)
  └─ target_glitch_cycle = 13
  └─ verify_pin('0000')
       └─ 10x INIT → cycle = 10
       └─ Byte 0:
            LOAD    (11) → no glitch
            COMPARE (12) → no glitch
            BRANCH  (13) → GLITCH! returns False
              └─ return True  (access granted — PIN never checked)
  └─ reveal_flag() → FLAG
```

Try all BRANCH cycles if one doesn't work:

```bash
for cycle in 13 16 19 22; do
    echo "--- Trying cycle $cycle ---"
    python3 firmware.py 0000 $cycle
done
```

---

## Flag

```
urchinsec{gl1tch_att4ck_byp4ss_succ3ss}
```

---

## Key Takeaways

- **Voltage glitching is a real hardware attack** — used against iPhones, ATM cards, hardware wallets, and game consoles
- **The BRANCH instruction is the target** — glitching the decision moment turns fail into pass
- **The PIN value does not matter** — you attack the decision, not the secret
- **Timing precision is everything** — one cycle too early or late and the glitch has no effect
- **Broken code is part of the challenge** — recognising what the code is supposed to do is core to firmware analysis
