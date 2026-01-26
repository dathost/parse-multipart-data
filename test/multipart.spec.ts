import * as chai from 'chai'

import { parse, DemoData, getBoundary } from '../src/multipart'

const expect = chai.expect

const expected = [
  {
    name: 'uploads[]',
    filename: 'A.txt',
    type: 'text/plain',
    data: Buffer.from('@11X111Y\r\n111Z\rCCCC\nCCCC\r\nCCCCC@\r\n')
  },
  {
    name: 'uploads[]',
    filename: 'B.txt',
    type: 'text/plain',
    data: Buffer.from('@22X222Y\r\n222Z\r222W\n2220\r\n666@')
  },
  { name: 'input1', data: Buffer.from('value1') }
]
describe('Multipart', function () {
  it('should parse multipart', function () {
    const { body, boundary } = DemoData()
    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(3)
    for (let i = 0; i < expected.length; i++) {
      const data = expected[i]
      const part = parts[i]

      expect(data.filename).to.be.equal(part.filename)
      expect(data.name).to.be.equal(part.name)
      expect(data.type).to.be.equal(part.type)
      expect(data.data.toString()).to.be.equal(part.data.toString())
    }
  })

  it('should get boundary', function () {
    const header =
      'multipart/form-data; boundary=----WebKitFormBoundaryvm5A9tzU1ONaGP5B'
    const boundary = getBoundary(header)

    expect(boundary).to.be.equal('----WebKitFormBoundaryvm5A9tzU1ONaGP5B')
  })

  it('should get boundary in single quotes', function () {
    const header =
      'multipart/form-data; boundary="----WebKitFormBoundaryvm5A9tzU1ONaGP5B"'
    const boundary = getBoundary(header)

    expect(boundary).to.be.equal('----WebKitFormBoundaryvm5A9tzU1ONaGP5B')
  })

  it('should get boundary in double quotes', function () {
    const header =
      "multipart/form-data; boundary='----WebKitFormBoundaryvm5A9tzU1ONaGP5B'"
    const boundary = getBoundary(header)

    expect(boundary).to.be.equal('----WebKitFormBoundaryvm5A9tzU1ONaGP5B')
  })

  it('should return empty string when no boundary in header', function () {
    expect(getBoundary('multipart/form-data')).to.be.equal('')
    expect(getBoundary('text/plain')).to.be.equal('')
    expect(getBoundary('')).to.be.equal('')
  })

  it('should not parse multipart if boundary is not correct', function () {
    const { body, boundary } = DemoData()
    const parts = parse(body, boundary + 'bad')

    expect(parts.length).to.be.equal(0)
  })

  it('should not parse if multipart is not correct', function () {
    const { boundary } = DemoData()
    const parts = parse(Buffer.from('hellow world'), boundary)

    expect(parts.length).to.be.equal(0)
  })

  it('should parse dotnet HttpClient request', function () {
    const parts = parse(
      Buffer.from(
        "--fefd3a31-7200-4abd-a7f6-39e0443ba01a\r\nContent-Disposition: form-data; name=file; filename=TestUploadFile.txt; filename*=utf-8''TestUploadFile.txt\r\n\r\nHELLO\n\nWORLD\n\r\n--fefd3a31-7200-4abd-a7f6-39e0443ba01a--\r\n"
      ),
      'fefd3a31-7200-4abd-a7f6-39e0443ba01a'
    )

    expect(parts.length).to.be.equal(1)
    expect(parts[0].filename).to.be.equal('TestUploadFile.txt')
    expect(parts[0].name).to.be.equal('file')
    expect(parts[0].type).to.be.equal(undefined)
    expect(parts[0].data.toString()).to.be.equal('HELLO\n\nWORLD\n')
  })

  it('should parse empty file', function () {
    const boundary = '----TestBoundary'
    const body = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="emptyfile"; filename="empty.txt"\r\n` +
        `Content-Type: text/plain\r\n` +
        `\r\n` +
        `\r\n--${boundary}--\r\n`
    )

    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(1)
    expect(parts[0].filename).to.be.equal('empty.txt')
    expect(parts[0].data.length).to.be.equal(0)
  })

  it('should parse binary data with null bytes', function () {
    const boundary = '----TestBoundary'
    const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x00, 0xff, 0x00, 0xfe])

    const header = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="binfile"; filename="binary.bin"\r\n` +
        `Content-Type: application/octet-stream\r\n` +
        `\r\n`
    )
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
    const body = Buffer.concat([header, binaryContent, footer])

    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(1)
    expect(parts[0].data.equals(binaryContent)).to.be.true
  })

  it('should parse data containing partial boundary prefix', function () {
    const boundary = '----TestBoundary'
    // Content that contains dashes but not a complete boundary
    const content = `some data\r\n----Test\r\nmore--data`

    const body = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="tricky.txt"\r\n` +
        `Content-Type: text/plain\r\n` +
        `\r\n` +
        `${content}\r\n` +
        `--${boundary}--\r\n`
    )

    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(1)
    expect(parts[0].data.toString()).to.be.equal(content)
  })

  it('should parse content with multiple CRLF sequences', function () {
    const boundary = '----TestBoundary'
    const content = 'line1\r\n\r\n\r\nline2\r\n\r\n'

    const body = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="newlines.txt"\r\n` +
        `Content-Type: text/plain\r\n` +
        `\r\n` +
        `${content}\r\n` +
        `--${boundary}--\r\n`
    )

    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(1)
    expect(parts[0].data.toString()).to.be.equal(content)
  })

  it('should parse multiple parts with mixed content types', function () {
    const boundary = '----TestBoundary'
    const textContent = 'Hello World'
    const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]) // PNG header bytes
    const formValue = 'form-field-value'

    const part1 = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="textfile"; filename="text.txt"\r\n` +
        `Content-Type: text/plain\r\n` +
        `\r\n` +
        `${textContent}\r\n`
    )
    const part2Header = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="image"; filename="image.png"\r\n` +
        `Content-Type: image/png\r\n` +
        `\r\n`
    )
    const part3 = Buffer.from(
      `\r\n--${boundary}\r\n` +
        `Content-Disposition: form-data; name="field"\r\n` +
        `\r\n` +
        `${formValue}\r\n` +
        `--${boundary}--\r\n`
    )

    const body = Buffer.concat([part1, part2Header, binaryContent, part3])

    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(3)
    expect(parts[0].filename).to.be.equal('text.txt')
    expect(parts[0].data.toString()).to.be.equal(textContent)
    expect(parts[1].filename).to.be.equal('image.png')
    expect(parts[1].type).to.be.equal('image/png')
    expect(parts[1].data.equals(binaryContent)).to.be.true
    expect(parts[2].name).to.be.equal('field')
    expect(parts[2].data.toString()).to.be.equal(formValue)
  })

  it('should handle filename with spaces and special characters', function () {
    const boundary = '----TestBoundary'
    const filename = 'my file (1).txt'

    const body = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: text/plain\r\n` +
        `\r\n` +
        `content\r\n` +
        `--${boundary}--\r\n`
    )

    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(1)
    expect(parts[0].filename).to.be.equal(filename)
  })

  it('should handle case-insensitive headers', function () {
    const boundary = '----TestBoundary'

    const body = Buffer.from(
      `--${boundary}\r\n` +
        `CONTENT-TYPE: text/plain\r\n` +
        `content-disposition: form-data; name="file"; filename="test.txt"\r\n` +
        `\r\n` +
        `content\r\n` +
        `--${boundary}--\r\n`
    )

    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(1)
    expect(parts[0].filename).to.be.equal('test.txt')
    expect(parts[0].type).to.be.equal('text/plain')
  })

  it('should handle filename with backslash and escaped quotes', function () {
    const boundary = '----TestBoundary'
    // Filename: file\"path\name.txt (contains quote and backslashes)
    // In header, this is JSON-escaped: "file\\\"path\\name.txt"
    const filenameInHeader = '"file\\\\\\\"path\\\\name.txt"'
    const expectedFilename = 'file\\"path\\name.txt'

    const body = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename=${filenameInHeader}\r\n` +
        `Content-Type: text/plain\r\n` +
        `\r\n` +
        `content\r\n` +
        `--${boundary}--\r\n`
    )

    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(1)
    expect(parts[0].filename).to.be.equal(expectedFilename)
  })

  it('should handle extra whitespace in headers', function () {
    const boundary = '----TestBoundary'

    const body = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Type:    text/plain  \r\n` +
        `Content-Disposition:   form-data;   name="file";   filename="test.txt"\r\n` +
        `\r\n` +
        `content\r\n` +
        `--${boundary}--\r\n`
    )

    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(1)
    expect(parts[0].type).to.be.equal('text/plain')
  })

  it('should handle UTF-8 content', function () {
    const boundary = '----TestBoundary'
    const utf8Content = 'Hello 世界 🌍 émojis и кириллица'

    const header = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="utf8.txt"\r\n` +
        `Content-Type: text/plain; charset=utf-8\r\n` +
        `\r\n`
    )
    const content = Buffer.from(utf8Content, 'utf-8')
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`)
    const body = Buffer.concat([header, content, footer])

    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(1)
    expect(parts[0].data.toString('utf-8')).to.be.equal(utf8Content)
  })

  // Configurable large data test. Current implementation fails at 128MB due to
  // JavaScript's max array length.
  const LARGE_FILE_TEST_SIZE_MB = 50

  it(`should parse ${LARGE_FILE_TEST_SIZE_MB}MB data`, function () {
    this.timeout(0) // disable timeout for large data test

    const boundary = '----TestBoundaryLarge'
    const fileSize = LARGE_FILE_TEST_SIZE_MB * 1024 * 1024

    // Create data content (repeating pattern)
    const dataContent = Buffer.alloc(fileSize, 'X')

    // Build multipart body
    const header = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="largefile"; filename="large.bin"\r\n` +
        `Content-Type: application/octet-stream\r\n` +
        `\r\n`
    )
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`)

    const body = Buffer.concat([header, dataContent, footer])

    const parts = parse(body, boundary)

    expect(parts.length).to.be.equal(1)
    expect(parts[0].filename).to.be.equal('large.bin')
    expect(parts[0].name).to.be.equal('largefile')
    expect(parts[0].type).to.be.equal('application/octet-stream')
    expect(parts[0].data.length).to.be.equal(fileSize)
    expect(parts[0].data.equals(dataContent)).to.be.true
  })
})
