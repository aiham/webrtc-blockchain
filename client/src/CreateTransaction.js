import React, { Component } from 'react';

class CreateTransaction extends Component {
  constructor(props) {
    super(props);
    this.state = {
      to: '',
      value: 0.0,
      fee: 0.0,
    };
  }

  onSubmit = () => {
    const { to } = this.state;
    const value = parseFloat(this.state.value);
    const fee = parseFloat(this.state.fee);
    if (this.state.to.length > 0 && value > 0 && fee > 0) {
      this.props.onSubmit({ to, value, fee });
    } else {
      console.error('Invalid form data');
    }
  }

  onChangeTo = event => {
    this.setState({ to: event.target.value });
  }

  onChangeValue = event => {
    this.setState({ value: event.target.value });
  }

  onChangeFee = event => {
    this.setState({ fee: event.target.value });
  }

  render() {
    return (
      <form onSubmit={this.onSubmit}>
        <div>
          <label>
            To <input type="text" value={this.state.to} onChange={this.onChangeTo} />
          </label>
        </div>
        <div>
          <label>
            Value <input type="text" value={this.state.value} onChange={this.onChangeValue} />
          </label>
        </div>
        <div>
          <label>
            Fee <input type="text" value={this.state.fee} onChange={this.onChangeFee} />
          </label>
        </div>
        <div><input type="submit" value="Create Transaction" /></div>
      </form>
    );
  }
}

export default CreateTransaction;
