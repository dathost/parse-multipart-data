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
})
