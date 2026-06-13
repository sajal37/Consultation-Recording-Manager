# AI usage

The brief asks for this, and I'd rather be straight about it than perform
either "I did it all alone" or "the AI did everything."

I used an AI coding assistant throughout, mostly as a faster way to write the
parts that don't need thought. The repetitive stuff — Zod schemas, the row
shapes, the boilerplate of a dozen near-identical React form fields, the first
pass of these docs — came out quicker with help than typing it all myself.

What I did *not* hand off were the decisions. Choosing the domain, deciding to
layer the server the way I did, putting transcription behind an interface,
ripping out SQLite when it wouldn't install and replacing it with the JSON
store — those were mine, and the reasoning behind each is in `PROJECT_NOTES.md`
in my own words. The SQLite-to-JSON pivot in particular came out of an actual
failure I had to diagnose on my machine, not a suggestion I accepted blindly.

I read every line that went in, ran it, and changed plenty of it. Where the
generated code was generic or over-commented I trimmed it. The integration work
— making the recorder, the upload, the streaming, the background job and the
polling actually line up — was me wiring real pieces together and fixing what
broke, which is most of where the time went.

Short version: AI sped up the typing so I could spend the time on the design and
on making it genuinely run. The judgement is mine.
